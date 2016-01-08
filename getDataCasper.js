phantom.casperPath = 'C:\\PhantomJS\\n1k0-casperjs-e3a77d0';
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
// casper.on("page.error", function(msg, trace) {
//     casper.echo("[Remote Page Error] " + msg, "ERROR");
//     casper.echo("[Remote Error trace] " + JSON.stringify(trace, undefined, 4));
// });

if (system.args.length < 3) {
	console.log('proper usage: getDataCasper.js username password');
	casper.exit();
}

var fs = require('fs');
var extractedData = [];

casper.start('http://www.realtytrac.com/', function() {
    this.echo(this.getTitle());
});

casper.thenEvaluate(function(username, password) {
    $('#username').val(username);
	$('#password').val(password);
	$('#headerLoginForm').submit();
}, system.args[1], system.args[2]);

casper.then(function() {
    console.log('login form submitted, new location is ' + this.getCurrentUrl());
});

casper.thenEvaluate(function() {
    $('#txtSearch').val('Riverside, CA');
	$('#header_searchspot').trigger('click');
});

casper.then(function() {
    console.log('riverside county search triggered, new location is ' + this.getCurrentUrl());
});

var preForclosureUrl;
casper.waitForSelector('#listTabs', function() {
   preForclosureUrl = casper.evaluate(function() {
      return $('a.tab-item:eq(1)').attr('href');
   });
   preForclosureUrl = 'http://www.realtytrac.com' + preForclosureUrl;

   console.log('going to "' + preForclosureUrl + '"');
   casper.thenOpen(preForclosureUrl, function() {
      console.log('at ' + preForclosureUrl);
   });
});

casper.waitForSelector('dd.equity', function() {
   console.log('found div.pagination');

   var pageCount = casper.evaluate(function() {
      return $('.pagination').find('.page:last').text().substr(2);
   });

   var pages = [];
   for (i = 0; i < pageCount-30; i++) {
      pages.push(i+1);
   }

   console.log('pages: ' + pages);

   casper.waitForSelector('dd.equity', function() {
      var currentPageNum = casper.evaluate(function() {
         return $('div.pagination > span.current').text();
      });

		var extractJson = function() {
			var houseArray = [];

			$('div.house > div.content').each(function(i, content) {
				var houseData = {};

				var addressData = $(content).find('div.basicdata > div.address-data > h2 > a > strong');
				houseData.streetAddress = addressData.find('span[itemprop=streetAddress]').text();
				houseData.city = addressData.find('span[itemprop=addressLocality]').text();
				houseData.state = addressData.find('span[itemprop=addressRegion]').text();
				houseData.zip = addressData.find('span[itemprop=postalCode]').text();

				var sizeData = $(content).find('div.basicdata > div.characteristics > dl.info > span.propertyInfo');
				sizeData.each(function(i, data) {
					var type = $(data).children('dt').text();

					if (type) {
						type = type.trim();
						if (type == 'Beds') {
							houseData.beds = $(data).children('dd').text().trim();
						}
						else if (type == 'Baths') {
							houseData.baths = $(data).children('dd').text().trim();
						}
						else if (type == 'sqft') {
							houseData.squareFeet = $(data).children('dd').text().trim();
						}
					}
				});

				var priceData = $(content).find('div.price-info > dl.info > span.propertyInfo');
				priceData.each(function(i, data) {
					var type = $(data).children('dt').attr('class');

					if (type) {
						type = type.trim();
						if (type == 'price') {
							houseData.price = $(data).children('dd').text().trim();
						}
						else if (type == 'date') {
							houseData.date = $(data).children('dd').text().trim();
						}
						else if (type == 'equity') {
							var equityLtv = $(data).children('dd').text().trim().split('/');
							houseData.equity = equityLtv[0];
							houseData.ltv = equityLtv[1];
						}
					}
				});

				houseArray.push(houseData);
			});

			return houseArray;
		}

      var houseArray = casper.evaluate(extractJson);

      for (i = 0; i < houseArray.length; i++) {
         extractedData.push(houseArray[i]);
      }

      casper.each(pages, function (self, page) {
         self.thenClick('div.pagination > a.next', function() {
            casper.waitForSelector('dd.equity', function() {
         		//var html = this.getHTML();

               var houseArray = casper.evaluate(extractJson);

               for (i = 0; i < houseArray.length; i++) {
                  extractedData.push(houseArray[i]);
               }

         		var currentPageNum = casper.evaluate(function() {
         			return $('div.pagination > span.current').text();
         		});
         		//fs.write(currentPageNum + '.html', html, 'wb');
               //casper.capture(currentPageNum + 'myimage.png');
         		console.log('finished processing page ' + currentPageNum);

               var waitTime = Math.floor((Math.random() * 5) + 1); //random number from 1-5
   				console.log('waiting for ' + waitTime + ' seconds');
   				this.wait(waitTime * 1000, function(){},20000);
            });
         });
      });
   });
});

casper.then(function() {
   fs.write('extractedData.json', JSON.stringify(extractedData), 'wb');
});

casper.run();
