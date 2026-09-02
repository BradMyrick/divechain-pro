// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DiveLogFactory} from "../src/DiveLogFactory.sol";

/// @notice Deploys the DiveLogFactory — the on-chain wallet → logbook registry.
///         Divers then call factory.createLogbook() from the dApp (per-wallet),
///         or factory.adoptLogbook(addr) to register pre-factory logbooks.
///
///         forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast --private-key <key> --slow
contract DeployScript is Script {
    function run() external returns (DiveLogFactory factory) {
        vm.startBroadcast();
        factory = new DiveLogFactory();
        vm.stopBroadcast();

        console.log("DiveLogFactory deployed at:", address(factory));
        console.log("Chain ID:", block.chainid);
    }
}
