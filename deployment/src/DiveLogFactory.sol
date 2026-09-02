// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {SovereignDiveLog} from "./SovereignDiveLog.sol";
import {IDiveLog} from "./interfaces/IDiveLog.sol";
import {IERC165} from "./interfaces/IERC165.sol";

/// @notice Minimal ownership view shared by ERC-8260 logbooks
///         (SovereignDiveLog exposes owner()).
interface IOwnedLogbook {
    function owner() external view returns (address);
}

/// @title DiveLogFactory
/// @notice On-chain registry mapping each wallet to its ERC-8260 logbook.
///         Deploying through the factory lets any client rediscover a diver's
///         logbook via logbookOf(diver) on any device, browser, or explorer —
///         no localStorage binding, no manual re-attachment.
///
///         Design notes:
///         - Each logbook is a full SovereignDiveLog deployment (not an
///           EIP-1167 clone): the reference implementation stores `owner` as an
///           immutable, which is embedded in bytecode and therefore incompatible
///           with minimal-proxy cloning.
///         - The factory is immutable, holds no funds, and has no admin
///           functions; every entry is keyed to msg.sender.
///         - One logbook per wallet per chain. The 1:1 mapping doubles as
///           replay protection for a future sponsored-deployment (meta-tx)
///           extension.
contract DiveLogFactory {
    event LogbookCreated(address indexed owner, address indexed logbook);
    event LogbookAdopted(address indexed owner, address indexed logbook);
    event LogbookReleased(address indexed owner, address indexed logbook);

    error AlreadyRegistered(address existing);
    error NothingRegistered(address owner);
    error NotDiveLog(address candidate);
    error NotLogbookOwner(address owner, address logbook);

    mapping(address => address) private _logbooks;

    /// @notice Deploy a new SovereignDiveLog owned by the caller and register it.
    function createLogbook() external returns (address logbook) {
        address existing = _logbooks[msg.sender];
        if (existing != address(0)) revert AlreadyRegistered(existing);

        SovereignDiveLog log = new SovereignDiveLog(msg.sender);
        logbook = address(log);
        _logbooks[msg.sender] = logbook;

        emit LogbookCreated(msg.sender, logbook);
    }

    /// @notice Register a logbook deployed outside the factory (e.g. before the
    ///         factory existed). The caller must own it and it must implement
    ///         IDiveLog per ERC-165. Uses bounded low-level staticcalls so that
    ///         codeless or malicious addresses fail closed with NotDiveLog.
    function adoptLogbook(address logbook) external {
        address existing = _logbooks[msg.sender];
        if (existing != address(0)) revert AlreadyRegistered(existing);
        if (logbook == address(0)) revert NotDiveLog(logbook);

        (bool ok, bytes memory result) = logbook.staticcall(
            abi.encodeWithSelector(IERC165.supportsInterface.selector, type(IDiveLog).interfaceId)
        );
        if (!ok || result.length != 32 || !abi.decode(result, (bool))) revert NotDiveLog(logbook);

        (bool okOwner, bytes memory ownerResult) =
            logbook.staticcall(abi.encodeWithSelector(IOwnedLogbook.owner.selector));
        if (!okOwner || ownerResult.length != 32) revert NotDiveLog(logbook);
        if (abi.decode(ownerResult, (address)) != msg.sender) {
            revert NotLogbookOwner(msg.sender, logbook);
        }

        _logbooks[msg.sender] = logbook;

        emit LogbookAdopted(msg.sender, logbook);
    }

    /// @notice Clear the caller's registry entry (e.g. undo a bad adopt).
    ///         Does not affect the logbook contract itself.
    function releaseLogbook() external {
        address existing = _logbooks[msg.sender];
        if (existing == address(0)) revert NothingRegistered(msg.sender);

        delete _logbooks[msg.sender];

        emit LogbookReleased(msg.sender, existing);
    }

    /// @notice The registered logbook for `diver`, or address(0) if none.
    function logbookOf(address diver) external view returns (address) {
        return _logbooks[diver];
    }
}
