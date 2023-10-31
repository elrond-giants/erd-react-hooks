# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2023-10-31
### Changed
- **Breaking:** Changed the default network urls that were using devnet2 back to devnet.

## [0.3.0] - 2022-08-05
### Changed
- **Breaking:** Changed `makeTranasction()` parameter type from `ITransactionProps` to `TransactionData`.
- `AuthConnector` - made `initProvider()` and `assertInitialized()` protected instead of private.