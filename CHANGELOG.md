# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-29

### Added

- `VendelClient.listDevices()` — list devices registered to the authenticated user, with `page`, `perPage`, and `deviceType` filters.
- `VendelClient.listMessages()` — list SMS messages with `page`, `perPage`, `status`, `deviceId`, `batchId`, `recipient`, `from`, and `to` filters.
- New `Device` type exported from the package barrel.
- Additional optional fields on `MessageStatus`: `from_number`, `body`, `message_type`, `sent_at`, `delivered_at`.
