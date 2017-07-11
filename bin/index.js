#! /usr/bin/env node
var fs = require('fs');
var getPaths = require('./getPaths');
var s = require('./sizes');
var replaceVals = require('./replaceVals');

// paths to read
var testPath = ['./tests/test.js']; // update dimensions.width and dimensions.height lines
var paths = ['./gulpfile.js'].concat(getPaths('./src', 'index.html').concat(getPaths('./src', 'manifest.js'))); // replace width and height instances
var sassPaths = getPaths('./sass', 'styles.scss'); // update $width, $height
var indexJSPaths = getPaths('./src', 'index.js'); // update width, height

var expandedSassPath = sassPaths.filter(function(path) {
	return ~path.indexOf('/expanded/');
});

// sizes
var newSizes = process.argv.reduce(s.getNewSizes, {});
var oldSizes = sassPaths
	.map(s.readSassFiles)
	.reduce(s.combineSizes);

var keys = Object.keys(oldSizes);

performReplacements();

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
	replaceVals(/\.width\)\.toBe\(\d+\,/, '.width).toBe(' + newSizes.width + ',', testPath);
	replaceVals(/It should be \d+px wide/, 'It should be ' + newSizes.width + 'px wide', testPath);
	replaceVals(/\.height\)\.toBe\(\d+\,/, '.height).toBe(' + newSizes.height + ',', testPath);
	replaceVals(/It should be \d+px tall/, 'It should be ' + newSizes.height + 'px tall', testPath);

	if (newSizes.k) {
		replaceVals(/should be under \d+kb/, 'should be under ' + newSizes.k + 'kb', testPath);
		replaceVals(/fileSizeInKB\)\.not\.toBeGreaterThan\(\d+\)/, 'fileSizeInKB).not.toBeGreaterThan(' + newSizes.k + ')', testPath);
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
