# latest commit from `nixos-unstable` at 2021-11-18 to support M1 Macs
{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/931ab058daa7e4cd539533963f95e2bb0dbd41e6.tar.gz") {
  overlays = [ (import (fetchGit { url = "git@github.com:soltalabs/nix"; ref = "main"; rev = "484883ab543f50247c12c7074db6378a637cd796"; })) ];
} }:

pkgs.mkShell {
  buildInputs = let
    nodeVersion = pkgs.nodejs-16_x;
  in [
    nodeVersion
    (pkgs.solta-yarn { node = nodeVersion; codeArtifact = true; })

    pkgs.bashInteractive
  ];
}
