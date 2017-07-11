var replace = require('replace');

module.exports = function(search, changeTo, paths) {
	replace({
		regex: search,
		replacement: changeTo,
		paths: paths
	});
}
