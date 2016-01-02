var page = require('webpage').create(),
    server = 'https://www.realtytrac.com/LoginSubmit',
    data = 'userName=ucrdba@gmail.com&password=shamrock_1';

page.onError = function (msg, trace) {
    console.log(msg);
    trace.forEach(function(item) {
        console.log('  ', item.file, ':', item.line);
    });
};
	
console.log('Requesting ' + server + '...');
//phantom.exit();

page.open(server, 'post', data, function (status) {
	if (status !== 'success') {
        console.log('Unable to post!');
		phantom.exit();
	} 
	else {
		console.log(page.content);
		
		//var dataUrl = 'http://www.realtytrac.com/mapsearch/ca/riverside-county/?address=Riverside%20county%2C%20CA&parsed=1&cn=riverside%20county&stc=ca';
		var dataUrl = 'http://www.google.com';
		console.log('Requesting ' + dataUrl + '...');
		var page2 = require('webpage').create()
		page2.open(dataUrl, function(status) {
			if (status !== 'success') {
				console.log('Unable to get data from ' + dataUrl);
			}
			else {
				console.log('Result from query:');
				console.log(page2.content);
			}
			phantom.exit();
		}
	}
});