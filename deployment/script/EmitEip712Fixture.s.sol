// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DiveLogTypedData} from "../src/interfaces/IDiveLogTypedData.sol";

/// @notice Emits a deterministic EIP-712 attestation fixture (digest + signature
///         from a TEST-ONLY key) as JSON for the frontend's vitest cross-check:
///         if TS and Solidity ever disagree on the domain/typehash, the test fails.
///         forge script script/EmitEip712Fixture.s.sol && ./export-fixture.sh
contract EmitEip712Fixture is Script {
    // Throwaway test key (also used in deployment/test/SovereignDiveLog.t.sol). Never fund it.
    uint256 constant ATTESTER_KEY = 0xB0D;
    uint256 constant CHAIN_ID = 43113;
    address constant VERIFYING_CONTRACT = 0x5adF6d5150a62D67Fa1A18ac7ddE8fcbaD392565;
    uint256 constant DIVE_ID = 7;
    uint256 constant NONCE = 3;

    function run() external {
        bytes32 digest =
            DiveLogTypedData.attestationDigest(DIVE_ID, VERIFYING_CONTRACT, CHAIN_ID, NONCE);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ATTESTER_KEY, digest);

        string memory json = string.concat(
            '{"chainId":"',
            vm.toString(CHAIN_ID),
            '","verifyingContract":"',
            vm.toString(VERIFYING_CONTRACT),
            '","diveId":"',
            vm.toString(DIVE_ID),
            '","nonce":"',
            vm.toString(NONCE),
            '","digest":"',
            vm.toString(digest),
            '","attester":"',
            vm.toString(vm.addr(ATTESTER_KEY)),
            '","v":',
            vm.toString(v),
            ',"r":"',
            vm.toString(r),
            '","s":"',
            vm.toString(s),
            '"}'
        );
        vm.writeFile("eip712-fixture.json", json);
        console.log("fixture written: eip712-fixture.json");
    }
}
