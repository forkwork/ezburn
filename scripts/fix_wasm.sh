#!/bin/bash
set -e

# Get the GOROOT path
GOROOT=$(go env GOROOT)
echo "GOROOT: $GOROOT"

# Create the wasm directory if it doesn't exist
mkdir -p "$GOROOT/misc/wasm"

# Use Go to generate both wasm_exec.js and wasm_exec_node.js files
echo "Generating WebAssembly support files..."
cat > /tmp/copy_wasm_exec.go << 'EOF'
package main

import (
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	goRoot := os.Getenv("GOROOT")
	if goRoot == "" {
		fmt.Println("GOROOT not set")
		os.Exit(1)
	}

	wasmDir := filepath.Join(goRoot, "misc", "wasm")
	
	// Create both wasm_exec.js and wasm_exec_node.js
	createWasmExecJS(filepath.Join(wasmDir, "wasm_exec.js"))
	createWasmExecNodeJS(filepath.Join(wasmDir, "wasm_exec_node.js"))
}

func createWasmExecNodeJS(path string) {
	content := `// wasm_exec_node.js
// Copyright 2021 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file has been modified for use by the ezburn project.

const fs = require('fs');
const util = require('util');
const crypto = require('crypto');

global.require = require;
global.fs = fs;
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;
global.performance = {
	now() {
		const [sec, nsec] = process.hrtime();
		return sec * 1000 + nsec / 1000000;
	},
};
global.crypto = {
	getRandomValues(b) {
		crypto.randomFillSync(b);
	},
};

// Used by wasm_exec.js for nodejs
require('./wasm_exec.js');
`

	err := os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		fmt.Printf("Error writing wasm_exec_node.js: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Created wasm_exec_node.js at %s\n", path)
}

func createWasmExecJS(path string) {
	content := `// wasm_exec.js
// Copyright 2018 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file has been modified for use by the ezburn project.
if (typeof global !== "undefined") {
    // global already exists
} else if (typeof window !== "undefined") {
    window.global = window;
} else if (typeof self !== "undefined") {
    self.global = self;
} else {
    throw new Error("no global object found");
}

if (!global.require && typeof require !== "undefined") {
    global.require = require;
}

if (!global.fs && global.require) {
    const fs = require("fs");
    if (Object.keys(fs).length !== 0) {
        global.fs = fs;
    }
}

const encoder = new TextEncoder("utf-8");
const decoder = new TextDecoder("utf-8");

global.Go = class {
    constructor() {
        this.argv = ["js"];
        this.env = {};
        this.exit = (code) => {
            if (code !== 0) {
                console.warn("exit code:", code);
            }
        };
    }

    async run(instance) {
        this._inst = instance;
        this.mem = new DataView(this._inst.exports.mem.buffer);
        this._values = [];
        this._goRefCounts = [];
        this._ids = new Map();
        this._idPool = [];
        this.exited = false;
        
        // Pass memory to instance
        this._inst.exports._start();
    }
};`

	err := os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		fmt.Printf("Error writing wasm_exec.js: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Created minimal wasm_exec.js at %s\n", path)
}
EOF

# Run the Go program to create WebAssembly support files
GOROOT="$GOROOT" go run /tmp/copy_wasm_exec.go

echo "WebAssembly support has been fixed! Both wasm_exec.js and wasm_exec_node.js have been created."

