phantom.casperPath = 'C:\\Users\\Bob\\Downloads\\n1k0-casperjs-1.0.4-0-ge3a77d0\\n1k0-casperjs-e3a77d0';
phantom.injectJs(phantom.casperPath + '\\bin\\bootstrap.js');

var system = require('system');
//console.log(system.args[1]);

var casper = require('casper').create({
//verbose: true,
//logLevel : 'debug'
});

casper.options.waitTimeout = 20000;

// help is tracing page's console.log 
//casper.on('remote.message', function(msg) { 
//    console.log('[Remote Page] ' + msg); 
//}); 

// Print out all the error messages from the web page 
casper.on("page.error", function(msg, trace) { 
    casper.echo("[Remote Page Error] " + msg, "ERROR"); 
    casper.echo("[Remote Error trace] " + JSON.stringify(trace, undefined, 4)); 
});

if (system.args.length < 3) {
	console.log('proper usage: getDataCasper.js username password');
	casper.exit();
}

var fs = require('fs');

casper.start('http://www.realtytrac.com/', function() {
    this.echo(this.getTitle());
});

casper.thenEvaluate(function(username, password) {
    $('#username').val(username);
	$('#password').val(password);
	$('#headerLoginForm').submit();
}, system.args[1], system.args[2]);

casper.then(function() {
    // Click on 1st result link
    console.log('login form submitted, new location is ' + this.getCurrentUrl());
	// console.log(this.getHTML());
});

casper.thenEvaluate(function() {
    $('#txtSearch').val('Riverside county, CA');
	$('#header_searchspot').trigger('click');
}, 'CasperJS');

casper.then(function() {
    // Click on 1st result link
    console.log('riverside county search triggered, new location is ' + this.getCurrentUrl());
	//console.log(this.getHTML());
});

casper.waitForSelector('#listTabs', function() {
	this.click('a.tab-item:nth-of-type(1)');
});
var writeCurrentPageToFile;
writeCurrentPageToFile = function() {
	console.log('writeCurrentPageToFile called');
	casper.waitForSelector('dd.equity', function() {	
		var html = this.getHTML();
		var currentPageNum = casper.evaluate(function() {
			return $('div.pagination > span.current').text();
		});
		fs.write(currentPageNum + '.html', html, 'wb');
		console.log('finished writing ' + currentPageNum + '.html to disk');
		
		var hasNext = casper.evaluate(function() {
			return $('div.pagination > a.next').length > 0;
		});
		
		console.log('hasNext: ' + hasNext);
		if (hasNext) {
			this.thenClick('div.pagination > a.next', function() {
				console.log('clicked next page button');
				
				var waitTime = Math.floor((Math.random() * 5) + 1); //random number from 1-10
				console.log('waiting for ' + waitTime + ' seconds');
				this.wait(waitTime * 1000, function(){
					console.log('write file to disk');
					writeCurrentPageToFile();
					console.log('saving image:' + currentPageNum + 'myimage.png');
			        casper.capture(currentPageNum + 'myimage.png');
				},20000);
			});
		}
		
		// var nextUrl = casper.evaluate(function() {
			// return $('div.pagination > span.current').next().attr('href');
		// });
		
		// if (nextUrl) {
			// console.log('opening ' + nextUrl + '...');
			// casper.thenOpen(nextUrl, function() {
				// writeCurrentPageToFile();
			// });
		// }

		// var vals = casper.evaluate(function() {
			// var vals = [];
			// $('dd.equity').each(function() {
				// vals.push($(this).text())
			// });
			
			// return vals;
		// });
		
		// for (var i = 0; i < vals.length; i++) {
			// console.log(vals[i]);
		// }
	});
}

casper.waitForSelector('div.pagination', function() {	
	writeCurrentPageToFile();
	//casper.capture('image.png') 
});

casper.run();



// casper.thenOpen('http://phantomjs.org', function() {
    // this.echo(this.getTitle());
// });

// casper.run();