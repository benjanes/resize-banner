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

performReplacements();

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

	if (arg.match(/\d+k/)) {
		sizes.k = arg.slice(0, arg.length - 1);
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

function replaceVals(search, changeTo, paths) {
	replace({
		regex: search,
		replacement: changeTo,
		paths: paths
	});
}

function performReplacements() {
	console.log('Starting to replace old sizes:');
	console.log(oldSizes);
	console.log('With new sizes:');
	console.log(newSizes);

	replaceTestJS();
	replaceHTML_and_Gulp();
	replaceJS();
	replaceSass();
	deleteZip();

	console.log('Done replacing sizes!');
}

function replaceTestJS() {
	replaceVals(oldSizes.width + 'x' + oldSizes.height, newSizes.width + 'x' + newSizes.height, testPath);
	replaceVals(/\.width\)\.toBe\(\d+\)/, '.width).toBe(' + newSizes.width + ')', testPath);
	replaceVals(/\.height\)\.toBe\(\d+\)/, '.height).toBe(' + newSizes.height + ')', testPath);

	if (newSizes.k) {
		replaceVals(/should be under \d+kb/, 'should be under ' + newSizes.k + 'kb', testPath); // line 6
		replaceVals(/fileSizeInKB\)\.not\.toBeGreaterThan\(\d+\)/, 'fileSizeInKB).not.toBeGreaterThan(' + newSizes.k + ')', testPath); // line 11
	}
}

function replaceHTML_and_Gulp() {
	replaceVals(oldSizes.width, '_oldWidth_', paths);
	replaceVals(oldSizes.height, '_oldHeight_', paths);

	if (oldSizes.widthExpanded) {
		replaceVals(oldSizes.widthExpanded, '_oldWidthExpanded_', paths);
		replaceVals(oldSizes.heightExpanded, '_oldHeightExpanded_', paths);
		replaceVals(oldSizes.widthExpanded + 'x' + oldSizes.heightExpanded, '_oldWidthExpandedXoldHeightExpanded_', paths);
	}

	replaceVals('_oldWidth_', newSizes.width, paths);
	replaceVals('_oldHeight_', newSizes.height, paths);

	if (oldSizes.widthExpanded) {
		replaceVals('_oldWidthExpanded_', newSizes.widthExpanded, paths);
		replaceVals('_oldHeightExpanded_', newSizes.heightExpanded, paths);
		replaceVals('_oldWidthExpandedXoldHeightExpanded_', newSizes.widthExpanded + 'x' + newSizes.heightExpanded, paths);
	}
}

function replaceJS() {
	keys.forEach(function(key) {
		replaceVals(oldSizes[key], '_old' + key + '_', indexJSPaths);
		replaceVals('_old' + key + '_', newSizes[key], indexJSPaths);
	});
}

function replaceSass() {
	replaceVals(/\$width\: \d+/, '$width: ' + newSizes.width, sassPaths);
	replaceVals(/\$height\: \d+/, '$height: ' + newSizes.height, sassPaths);

	if (oldSizes.widthExpanded) {
		replaceVals(/\$expanded\-width\: \d+/, '$expanded-width: ' + newSizes.widthExpanded, sassPaths);
		replaceVals(/\$expanded\-height\: \d+/, '$expanded-height: ' + newSizes.heightExpanded, sassPaths);
	}

	if (expandedSassPath.length) {
		replaceVals(/\$width\: \d+/, '$width: ' + newSizes.widthExpanded, expandedSassPath);
		replaceVals(/\$height\: \d+/, '$height: ' + newSizes.heightExpanded, expandedSassPath);
	}
}

function deleteZip() {
	console.log('Deleting old zip file');
	var zipPath = fs.readdirSync('./')
		.filter(function(file) {
			return /\.zip$/.test(file);
		})[0];

	if (zipPath) fs.unlinkSync('./' + zipPath);
}

