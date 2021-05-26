module.exports = () => {
	const args = {};

	for (let i = 0; i < process.argv.length; ++i)
		if (process.argv[i].startsWith('--'))
			if(process.argv[i + 1] && !process.argv[i + 1].startsWith('--'))
				args[process.argv[i].replace('--', '')] = process.argv[i + 1];
			else
				args[process.argv[i].replace('--', '')] = true;

	return args;
};
