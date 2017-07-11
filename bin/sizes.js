var fs = require('fs');

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

module.exports = {
	readSassFiles: readSassFiles,
	getNewSizes: getNewSizes,
	combineSizes: combineSizes
};
