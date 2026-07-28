// Test what sass.js accepts
const fs = require('fs');
const vm = require('vm');

// Read the sass.js file
const sassCode = fs.readFileSync('libs/sass/sass.sync.min.js', 'utf8');

// Create a context
const context = {
    console: console,
    module: { exports: {} },
    exports: {},
    require: require,
    global: {},
    window: {},
    document: {}
};

// Execute sass.js
vm.createContext(context);
vm.runInContext(sassCode, context);

// Check what's available
if (context.Sass) {
    console.log('Sass found');
    console.log('Methods:', Object.keys(context.Sass).filter(k => typeof context.Sass[k] === 'function'));
} else {
    console.log('Sass not found, checking window...');
    console.log('Context keys:', Object.keys(context));
}
