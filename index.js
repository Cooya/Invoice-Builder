const { execSync } = require('child_process');
const dateformat = require('dateformat');
const fs = require('fs');
const Twig = require('twig');

const readProcessArgs = require('./read_process_args');

// configuration
const { outputFolder, templatesFolder, tasks } = require('./config');
const tracking = require('./tracking.json');

(async () => {
	let { task, template, test, html, fromDate, toDate, price } = readProcessArgs();
	if(!task) {
		if(!template)
			throw new Error('Template is missing');
		if(!fromDate)
			throw new Error('From date is missing');
		if(!toDate)
			throw new Error('To date is missing');
	}

	if(task === 'delays') {
		computeDelays();
		console.log(tracking);
		return;
	}

	if(!tasks[task])
		throw new Error(`Unknown task "${task}"`);

	({ template, fromDate, toDate, price } = tasks[task]);

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
		today: dateformat(new Date(), 'dd/mm/yyyy'),
		fromDate: typeof fromDate === 'function' ? fromDate() : fromDate,
		toDate: typeof toDate === 'function' ? toDate() : toDate,
		price
	}));

	if(!html) {
		// transform the html into pdf
		const outputFile = `${!test ? outputFolder : './'}facture_${invoiceNumber.replace(/-/g, '_')}.pdf`;
		execSync(`node_modules/.bin/html5-to-pdf tmp.html > "${outputFile}"`);
		fs.unlinkSync('tmp.html');
		console.log(outputFile);

		// update the tracking file
		tracking[task].lastInvoiceDate = dateformat(new Date(), 'dd/mm/yyyy');
		computeDelays();
		fs.writeFileSync('./tracking.json', JSON.stringify(tracking, null, 4));
	}
})();

function computeDelays() {
	for(let [partnerName, { lastInvoiceDate, lastPaymentDate }] of Object.entries(tracking)) {
		// compute the threshold date
		lastInvoiceDate = new Date(lastInvoiceDate.split('/').reverse().join('-'));
		lastPaymentDate = lastPaymentDate && new Date(lastPaymentDate.split('/').reverse().join('-'));
		const thresholdDate = lastPaymentDate < lastInvoiceDate ? new Date() : null;

		// compute the delay
		const delay = thresholdDate && Math.round((thresholdDate.getTime() - lastInvoiceDate.getTime()) / (1000 * 3600 * 24));
		tracking[partnerName].delay = delay ? `${delay}j` : null;
	}
}
