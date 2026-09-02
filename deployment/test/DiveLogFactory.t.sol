// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DiveLogFactory} from "../src/DiveLogFactory.sol";
import {SovereignDiveLog} from "../src/SovereignDiveLog.sol";
import {IDiveLog} from "../src/interfaces/IDiveLog.sol";

contract NotALogbook {
    function nothingHere() external pure returns (uint256) {
        return 42;
    }
}

contract LyingLogbook {
    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }

    function owner() external pure returns (address) {
        return address(0xBEEF);
    }
}

contract SpoofedLogbook {
    address public immutable claimedOwner;

    constructor(address claimed) {
        claimedOwner = claimed;
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }

    function owner() external view returns (address) {
        return claimedOwner;
    }
}

contract DiveLogFactoryTest is Test {
    DiveLogFactory internal factory;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        factory = new DiveLogFactory();
    }

    function test_CreateLogbook() public {
        vm.prank(alice);
        address lb = factory.createLogbook();
        assertTrue(lb != address(0));
        assertEq(factory.logbookOf(alice), lb);
        assertEq(SovereignDiveLog(lb).owner(), alice);
        assertTrue(SovereignDiveLog(lb).supportsInterface(type(IDiveLog).interfaceId));
    }

    function test_CreateLogbook_IndependentPerWallet() public {
        vm.prank(alice);
        address lbA = factory.createLogbook();
        vm.prank(bob);
        address lbB = factory.createLogbook();
        assertTrue(lbA != lbB);
        assertEq(SovereignDiveLog(lbA).owner(), alice);
        assertEq(SovereignDiveLog(lbB).owner(), bob);
    }

    function test_CreateLogbook_RevertIf_AlreadyRegistered() public {
        vm.startPrank(alice);
        factory.createLogbook();
        address existing = factory.logbookOf(alice);
        vm.expectRevert(abi.encodeWithSelector(DiveLogFactory.AlreadyRegistered.selector, existing));
        factory.createLogbook();
        vm.stopPrank();
    }

    function test_AdoptLogbook() public {
        vm.prank(alice);
        SovereignDiveLog standalone = new SovereignDiveLog(alice);

        vm.prank(alice);
        factory.adoptLogbook(address(standalone));
        assertEq(factory.logbookOf(alice), address(standalone));
    }

    function test_AdoptLogbook_RevertIf_AlreadyRegistered() public {
        vm.startPrank(alice);
        factory.createLogbook();
        SovereignDiveLog standalone = new SovereignDiveLog(alice);
        address existing = factory.logbookOf(alice);
        vm.expectRevert(abi.encodeWithSelector(DiveLogFactory.AlreadyRegistered.selector, existing));
        factory.adoptLogbook(address(standalone));
        vm.stopPrank();
    }

    function test_AdoptLogbook_RevertIf_EOA() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DiveLogFactory.NotDiveLog.selector, bob));
        factory.adoptLogbook(bob);
    }

    function test_AdoptLogbook_RevertIf_NonCompliantContract() public {
        NotALogbook fake = new NotALogbook();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DiveLogFactory.NotDiveLog.selector, address(fake)));
        factory.adoptLogbook(address(fake));
    }

    function test_AdoptLogbook_RevertIf_WrongOwner() public {
        LyingLogbook liar = new LyingLogbook();
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(DiveLogFactory.NotLogbookOwner.selector, alice, address(liar))
        );
        factory.adoptLogbook(address(liar));
    }

    function test_AdoptLogbook_SpoofOnlyAffectsOwnSlot() public {
        // A contract that claims a hardcoded owner can only pollute that
        // address's own registry entry — self-harm, not an attack on others.
        SpoofedLogbook fake = new SpoofedLogbook(alice);
        vm.prank(alice);
        factory.adoptLogbook(address(fake));
        assertEq(factory.logbookOf(alice), address(fake));
        assertEq(factory.logbookOf(bob), address(0));
    }

    function test_ReleaseLogbook() public {
        vm.startPrank(alice);
        address lb = factory.createLogbook();
        factory.releaseLogbook();
        vm.stopPrank();
        assertEq(factory.logbookOf(alice), address(0));

        vm.prank(alice);
        address lb2 = factory.createLogbook();
        assertTrue(lb2 != lb);
    }

    function test_ReleaseLogbook_RevertIf_NothingRegistered() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DiveLogFactory.NothingRegistered.selector, alice));
        factory.releaseLogbook();
    }

    function test_Events() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, false); // topic2 (new logbook addr) unpredictable
        emit LogbookCreated(alice, address(0));
        address lb = factory.createLogbook();
        assertTrue(lb != address(0));

        vm.prank(bob);
        SovereignDiveLog standalone = new SovereignDiveLog(bob);
        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit LogbookAdopted(bob, address(standalone));
        factory.adoptLogbook(address(standalone));

        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit LogbookReleased(bob, address(standalone));
        factory.releaseLogbook();
    }

    event LogbookCreated(address indexed owner, address indexed logbook);
    event LogbookAdopted(address indexed owner, address indexed logbook);
    event LogbookReleased(address indexed owner, address indexed logbook);
}

contract FactoryHandler is Test {
    DiveLogFactory public immutable factory;
    address[5] public actors;
    SovereignDiveLog[5] public candidates;

    constructor(DiveLogFactory f) {
        factory = f;
        for (uint256 i; i < 5; ++i) {
            actors[i] = address(uint160(0x1000 + i));
            candidates[i] = new SovereignDiveLog(actors[i]);
        }
    }

    function create(uint8 actorId) external {
        vm.prank(actors[actorId % 5]);
        try factory.createLogbook() {} catch {}
    }

    function adopt(uint8 actorId, uint8 candidateId) external {
        vm.prank(actors[actorId % 5]);
        try factory.adoptLogbook(address(candidates[candidateId % 5])) {} catch {}
    }

    function release(uint8 actorId) external {
        vm.prank(actors[actorId % 5]);
        try factory.releaseLogbook() {} catch {}
    }
}

contract DiveLogFactoryInvariantTest is Test {
    DiveLogFactory internal factory;
    FactoryHandler internal handler;

    function setUp() public {
        factory = new DiveLogFactory();
        handler = new FactoryHandler(factory);
        targetContract(address(handler));
    }

    function invariant_RegisteredLogbookOwnedByRegistrant() external view {
        for (uint256 i; i < 5; ++i) {
            address actor = handler.actors(i);
            address lb = factory.logbookOf(actor);
            if (lb != address(0)) {
                assertEq(
                    SovereignDiveLog(lb).owner(),
                    actor,
                    "registered logbook not owned by registrant"
                );
                assertTrue(
                    SovereignDiveLog(lb).supportsInterface(type(IDiveLog).interfaceId),
                    "registered logbook not ERC-8260"
                );
            }
        }
    }

    function invariant_ReleasedSlotIsAlwaysReclaimable() external {
        for (uint256 i; i < 5; ++i) {
            address actor = handler.actors(i);
            address lb = factory.logbookOf(actor);
            if (lb == address(0)) {
                vm.prank(actor);
                address created = factory.createLogbook();
                assertEq(SovereignDiveLog(created).owner(), actor);
            } else {
                vm.prank(actor);
                try factory.releaseLogbook() {
                // slot cleared: next iteration proves it is reclaimable
                }
                    catch {}
            }
        }
    }
}
