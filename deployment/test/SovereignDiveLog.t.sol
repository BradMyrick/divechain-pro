// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SovereignDiveLog} from "../src/SovereignDiveLog.sol";
import {IDiveLog} from "../src/interfaces/IDiveLog.sol";
import {DiveLogTypedData} from "../src/interfaces/IDiveLogTypedData.sol";
import "../src/interfaces/IDiveLogTypes.sol";

contract SovereignDiveLogTest is Test {
    uint256 internal constant _N =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
    uint256 internal constant _HALF_N =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    SovereignDiveLog internal diveLog;
    uint256 internal ownerKey = 0xA11CE;
    uint256 internal buddyKey = 0xB0D;
    address internal owner = makeAddr("owner");
    address internal buddy = makeAddr("buddy");

    function setUp() public {
        owner = vm.addr(ownerKey);
        buddy = vm.addr(buddyKey);
        diveLog = new SovereignDiveLog(owner);
    }

    function _input(uint64 diveDate) internal pure returns (DiveInput memory) {
        return DiveInput({
            diveDate: diveDate,
            units: UnitSystem.Metric,
            data: DiveData({
                leaveSurfaceTime: 1_700_000_000,
                leaveBottomTime: 1_700_001_800,
                reachSurfaceTime: 1_700_003_600,
                bottomTimeMinutes: 30,
                maxDepth: 18,
                averageDepth: 12,
                mode: DiveMode.SCUBA,
                purpose: DivePurpose.Recreational,
                suit: SuitType.Wet
            }),
            env: Environment({
                airTemp: 28,
                waterTemp: 24,
                currentKnots: 1,
                bottomType: BottomType.Rock,
                coords: Coordinates({latitude: 11_150_000, longitude: -74_200_000}),
                location: "Santa Marta",
                weatherConditions: "Clear"
            }),
            decomp: Decompression({
                decompType: DecompressionType.NoneDecomp,
                totalDecompTimeMinutes: 0,
                maxDepthAttained: 18,
                tableSchedule: bytes32(0),
                repetitiveGroup: bytes1(0),
                surfaceIntervalMinutes: 0,
                newRepetitiveGroup: bytes1(0)
            }),
            gas: GasData({
                gasType: BreathingGas.Air,
                o2Percent: 2_090,
                hePercent: 0,
                n2Percent: 7_910,
                cylinderPressureIn: 2_070,
                cylinderPressureOut: 690,
                gasConsumed: 1_380,
                bailoutPressure: 0
            }),
            remarks: "Nice reef dive"
        });
    }

    function test_LogDive() public {
        vm.prank(owner);
        uint256 id = diveLog.logDive(_input(1_700_000_000));
        assertEq(id, 1);
        assertEq(diveLog.diveCount(), 1);
        assertEq(diveLog.getDive(1).data.maxDepth, 18);
    }

    function test_LogDive_RevertIf_NotOwner() public {
        vm.prank(buddy);
        vm.expectRevert(IDiveLog.NotOwner.selector);
        diveLog.logDive(_input(1_700_000_000));
    }

    function test_LogDive_RevertIf_ZeroDate() public {
        vm.prank(owner);
        vm.expectRevert(SovereignDiveLog.InvalidDate.selector);
        diveLog.logDive(_input(0));
    }

    function test_BatchLogDives() public {
        DiveInput[] memory inputs = new DiveInput[](2);
        inputs[0] = _input(1_700_000_000);
        inputs[1] = _input(1_700_010_000);
        vm.prank(owner);
        uint256[] memory ids = diveLog.batchLogDives(inputs);
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
    }

    function test_BatchLogDives_RevertIf_Empty() public {
        DiveInput[] memory inputs = new DiveInput[](0);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SovereignDiveLog.InvalidBatchSize.selector, 0));
        diveLog.batchLogDives(inputs);
    }

    function test_BatchLogDives_RevertIf_TooLarge() public {
        DiveInput[] memory inputs = new DiveInput[](diveLog.MAX_BATCH_SIZE() + 1);
        for (uint256 i; i < inputs.length; ++i) {
            inputs[i] = _input(1_700_000_000 + uint64(i));
        }
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(SovereignDiveLog.InvalidBatchSize.selector, inputs.length)
        );
        diveLog.batchLogDives(inputs);
    }

    function test_BatchLogDives_MaxBatchSucceeds() public {
        DiveInput[] memory inputs = new DiveInput[](diveLog.MAX_BATCH_SIZE());
        for (uint256 i; i < inputs.length; ++i) {
            inputs[i] = _input(1_700_000_000 + uint64(i));
        }
        vm.prank(owner);
        uint256[] memory ids = diveLog.batchLogDives(inputs);
        assertEq(ids.length, diveLog.MAX_BATCH_SIZE());
        assertEq(diveLog.diveCount(), diveLog.MAX_BATCH_SIZE());
    }

    function _attest(uint256 diveId, uint256 nonce, uint8 v, bytes32 r, bytes32 s) internal {
        bytes memory sig = abi.encodePacked(r, s, v);
        diveLog.attestDive(diveId, nonce, sig);
    }

    function _signAttestation(uint256 diveId, uint256 nonce)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        bytes32 digest =
            DiveLogTypedData.attestationDigest(diveId, address(diveLog), block.chainid, nonce);
        (v, r, s) = vm.sign(buddyKey, digest);
    }

    function test_AttestDive() public {
        vm.prank(owner);
        diveLog.logDive(_input(1_700_000_000));

        (uint8 v, bytes32 r, bytes32 s) = _signAttestation(1, 0);
        _attest(1, 0, v, r, s);

        Attestation[] memory atts = diveLog.getAttestations(1);
        assertEq(atts.length, 1);
        assertEq(atts[0].attester, buddy);
        assertEq(diveLog.attesterNonce(buddy), 1);
    }

    function test_AttestDive_RevertIf_WrongNonce() public {
        vm.prank(owner);
        diveLog.logDive(_input(1_700_000_000));

        (uint8 v, bytes32 r, bytes32 s) = _signAttestation(1, 1);
        vm.expectRevert(abi.encodeWithSelector(IDiveLog.NonceMismatch.selector, 0, 1));
        _attest(1, 1, v, r, s);
    }

    function test_AttestDive_RevertIf_Replay() public {
        vm.prank(owner);
        diveLog.logDive(_input(1_700_000_000));

        (uint8 v, bytes32 r, bytes32 s) = _signAttestation(1, 0);
        _attest(1, 0, v, r, s);

        // Stale signature: nonce check fires first (nonce advanced to 1)
        vm.expectRevert(abi.encodeWithSelector(IDiveLog.NonceMismatch.selector, 1, 0));
        _attest(1, 0, v, r, s);

        // Fresh signature for the same dive: dedup fires
        (uint8 v2, bytes32 r2, bytes32 s2) = _signAttestation(1, 1);
        vm.expectRevert(abi.encodeWithSelector(IDiveLog.AlreadyAttested.selector, 1, buddy));
        _attest(1, 1, v2, r2, s2);
    }

    function test_AttestDive_RevertIf_MalleableHighS() public {
        vm.prank(owner);
        diveLog.logDive(_input(1_700_000_000));

        (uint8 v, bytes32 r, bytes32 s) = _signAttestation(1, 0);
        // Normalize to canonical low-s, then flip to the malleable high-s twin.
        if (uint256(s) > _HALF_N) {
            s = bytes32(_N - uint256(s));
            v = v ^ 1;
        }
        uint8 vHigh = v ^ 1;
        bytes32 sHigh = bytes32(_N - uint256(s));

        vm.expectRevert(IDiveLog.InvalidSignature.selector);
        _attest(1, 0, vHigh, r, sHigh);
    }

    function test_AttestDive_RevertIf_MalformedSignature() public {
        vm.prank(owner);
        diveLog.logDive(_input(1_700_000_000));
        vm.expectRevert(IDiveLog.InvalidSignature.selector);
        diveLog.attestDive(1, 0, hex"deadbeef");
    }

    function test_VoidDive() public {
        vm.prank(owner);
        diveLog.logDive(_input(1_700_000_000));
        vm.prank(owner);
        diveLog.voidDive(1, 0, "wrong gas mix");
        assertTrue(diveLog.isDiveVoided(1));
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IDiveLog.DiveAlreadyVoided.selector, 1));
        diveLog.voidDive(1, 0, "double void");
    }

    function test_SupportsInterface() public view {
        assertTrue(diveLog.supportsInterface(type(IDiveLog).interfaceId));
        assertTrue(diveLog.supportsInterface(0x01ffc9a7));
        assertFalse(diveLog.supportsInterface(0xffffffff));
    }
}
