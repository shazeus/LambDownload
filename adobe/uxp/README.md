# UXP Host Notes

Premiere Pro 25.6+ can load the panel through UXP Developer Tool.

The panel talks to the local LambDownload service on `127.0.0.1:4317`. After a download finishes, the UXP host adapter should call Premiere's `project.importFiles()` with the downloaded media path.

CEP remains included for After Effects because After Effects project import automation still relies on ExtendScript in many production setups.
