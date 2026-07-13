// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SovereignDiveLog} from "../src/SovereignDiveLog.sol";

/// @notice Deploys an ERC-8260 SovereignDiveLog owned by LOGBOOK_OWNER (defaults to the deployer).
///         forge script script/Deploy.s.sol -rw <rpc> --broadcast --private-key <key>
contract DeployScript is Script {
    function run() external returns (SovereignDiveLog log) {
        address owner = vm.envOr("LOGBOOK_OWNER", msg.sender);

        vm.startBroadcast();
        log = new SovereignDiveLog(owner);
        vm.stopBroadcast();

        console.log("SovereignDiveLog deployed at:", address(log));
        console.log("Owner:", owner);
        console.log("Chain ID:", block.chainid);
    }
}
