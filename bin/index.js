#! /usr/bin/env node

var fs = require('fs');
var replace = require('replace');

// paths to read
var testPath = ['./tests/test.js']; // update dimensions.width and dimensions.height lines
var paths = ['./gulpfile.js'].concat(getPaths('./src', 'index.html').concat(getPaths('./src', 'manifest.js'))); // replace width and height instances
var sassPaths = getPaths('./sass', 'styles.scss'); // update $width, $height
var indexJSPaths = getPaths('./src', 'index.js'); // update width, height

var expandedSassPath = sassPaths.filter(function(path) {
	return ~path.indexOf('/expanded/');
});

// sizes
var newSizes = process.argv.reduce(getNewSizes, {});
var oldSizes = sassPaths
	.map(readSassFiles)
	.reduce(combineSizes);

var keys = Object.keys(oldSizes);

console.log('Starting to replace old sizes:');
console.log(oldSizes);
console.log('With new sizes:');
console.log(newSizes);

// replace dimensions in test path
replace({
	regex: /\.width\)\.not\.toBeGreaterThan\(\d+\)/,
	replacement: '.width).not.toBeGreaterThan(' + newSizes.width + ')',
	paths: testPath
});

replace({
	regex: /\.height\)\.not\.toBeGreaterThan\(\d+\)/,
	replacement: '.height).not.toBeGreaterThan(' + newSizes.height + ')',
	paths: testPath
});


// replace dimensions in html and gulpfile
replace({
	regex: oldSizes.width,
	replacement: '_oldWidth_',
	paths: paths
});
replace({
	regex: oldSizes.height,
	replacement: '_oldHeight_',
	paths: paths
});
if (oldSizes.widthExpanded) {
	replace({
		regex: oldSizes.widthExpanded,
		replacement: '_oldWidthExpanded_',
		paths: paths
	});
	replace({
		regex: oldSizes.heightExpanded,
		replacement: '_oldHeightExpanded_',
		paths: paths
	});
}

replace({
	regex: '_oldWidth_',
	replacement: newSizes.width,
	paths: paths
});
replace({
	regex: '_oldHeight_',
	replacement: newSizes.height,
	paths: paths
});
if (oldSizes.widthExpanded) {
	replace({
		regex: '_oldWidthExpanded_',
		replacement: newSizes.widthExpanded,
		paths: paths
	});
	replace({
		regex: '_oldHeightExpanded_',
		replacement: newSizes.heightExpanded,
		paths: paths
	});
}

if (oldSizes.widthExpanded) {
	replace({
		regex: oldSizes.widthExpanded + 'x' + oldSizes.heightExpanded,
		replacement: '_oldWidthExpandedXoldHeightExpanded_',
		paths: paths
	});
	replace({
		regex: '_oldWidthExpandedXoldHeightExpanded_',
		replacement: newSizes.widthExpanded + 'x' + newSizes.heightExpanded,
		paths: paths
	});
}

// replace dimensions in index.js files
keys.forEach(function(key) {
	replace({
		regex: oldSizes[key],
		replacement: '_old' + key + '_',
		paths: indexJSPaths
	});
});
keys.forEach(function(key) {
	replace({
		regex: '_old' + key + '_',
		replacement: newSizes[key],
		paths: indexJSPaths
	});
});


// replace dimensions in sass
replace({
	regex: /\$width\: \d+/,
	replacement: '$width: ' + newSizes.width,
	paths: sassPaths
});
replace({
	regex: /\$height\: \d+/,
	replacement: '$height: ' + newSizes.height,
	paths: sassPaths
});

if (oldSizes.widthExpanded) {
	replace({
		regex: /\$expanded\-width\: \d+/,
		replacement: '$expanded-width: ' + newSizes.widthExpanded,
		paths: sassPaths
	});
	replace({
		regex: /\$expanded\-height\: \d+/,
		replacement: '$expanded-height: ' + newSizes.heightExpanded,
		paths: sassPaths
	});
}

if (expandedSassPath.length) {
	replace({
		regex: /\$width\: \d+/,
		replacement: '$width: ' + newSizes.widthExpanded,
		paths: expandedSassPath
	});
	replace({
		regex: /\$height\: \d+/,
		replacement: '$height: ' + newSizes.heightExpanded,
		paths: expandedSassPath
	});
}

console.log('Done replacing sizes!');

function getPaths(currPath, fileName) {
	return fs.readdirSync(currPath)
		.map(function(file) {
			if (fs.lstatSync(currPath + '/' + file).isFile()) {
				if (file === fileName) return currPath + '/' + file;
				return;
			}
			return getPaths(currPath + '/' + file, fileName);
		})
		.reduce(flatten, [])
		.filter(function(path) {
			return path !== undefined;
		});
}

function flatten(flattened, item) {
	if (!Array.isArray(item)) return flattened.concat([item]);
	return flattened.concat(item.reduce(flatten, []));
}

function readSassFiles(path) {
	if (~path.indexOf('/expanded/')) return checkSizeVars(path, true);
	return checkSizeVars(path);
}

function checkSizeVars(path, isExpanded) {
	var sizes = fs.readFileSync(path, 'utf8')
		.split('\n')
		.reduce(function(sizes, currLine) {
			if (/\$width\:\s?\d+px;/.test(currLine)) {
				sizes.width = currLine.match(/\d+/g)[0];
			} else if (/\$height\:\s?\d+px;/.test(currLine)) {
				sizes.height = currLine.match(/\d+/g)[0];
			} else if (/\$expanded-width\:\s?\d+px;/.test(currLine)) {
				sizes.widthExpanded = currLine.match(/\d+/g)[0];
			} else if (/\$expanded-height\:\s?\d+px;/.test(currLine)) {
				sizes.heightExpanded = currLine.match(/\d+/g)[0];
			}
			return sizes;
		}, {});
	if (isExpanded) {
		sizes.widthExpanded = sizes.width;
		sizes.heightExpanded = sizes.height;
		delete sizes.width;
		delete sizes.height;
	}
	return sizes;
}

function getNewSizes(sizes, arg) {
	if (arg.match(/^\d+x\d+$/)) {
		if (!sizes.hasOwnProperty('width')) {
			sizes.width = arg.split('x')[0];
			sizes.height = arg.split('x')[1];
		} else {
			sizes.widthExpanded = arg.split('x')[0];
			sizes.heightExpanded = arg.split('x')[1];
		}
	}
	return sizes;
}

function combineSizes(sizes, sizeObj) {
	for (var key in sizeObj) {
		if (sizeObj.hasOwnProperty(key)) {
			sizes[key] = sizeObj[key];
		}
	}
	return sizes;
}
