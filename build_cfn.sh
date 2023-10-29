#!/usr/bin/env bash
set -ex
echo "build template"
cdk synth --path-metadata false --version-reporting false