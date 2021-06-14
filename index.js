const { execSync } = require('child_process');
const dateformat = require('dateformat');
const fs = require('fs');
const Twig = require('twig');

const readProcessArgs = require('./read_process_args');

// configuration
const { outputFolder, templatesFolder } = require('./config');

(async () => {
	const { template, test, html, fromDate, toDate } = readProcessArgs();
	if(!template)
		throw new Error('Template is missing');

	// load the twig template
	const twigTemplate = Twig.twig({
		data: fs.readFileSync(`${templatesFolder}${template}.html.twig`).toString()
	});

	// generate the invoice number
	let invoiceNumber = parseInt(fs.readdirSync(outputFolder).reduce((max, fileName) => {
		const number = fileName.match(/_([0-9]{3}).pdf/)[1];
		if(number > max)
			max = number;
		return max;
	}, 0)) + 1;
	if(String(invoiceNumber).length === 1) invoiceNumber = '00' + invoiceNumber;
	else if(String(invoiceNumber).length === 2) invoiceNumber = '0' + invoiceNumber;
	invoiceNumber = new Date().getFullYear() + '-' + invoiceNumber;

	// render the twig template
	fs.writeFileSync('tmp.html', twigTemplate.render({
		invoiceNumber,
		today: dateformat(new Date, 'dd/mm/yyyy'),
		fromDate,
		toDate
	}));

	if(!html) {
		const outputFile = `${!test ? outputFolder : './'}facture_${invoiceNumber.replace(/-/g, '_')}.pdf`;
		execSync(`node_modules/.bin/html5-to-pdf tmp.html > "${outputFile}"`);
		fs.unlinkSync('tmp.html');
		console.log(outputFile);
	}
})();
