var fs = require('fs');

function flatten(flattened, item) {
	if (!Array.isArray(item)) return flattened.concat([item]);
	return flattened.concat(item.reduce(flatten, []));
}

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
};

module.exports = getPaths;
