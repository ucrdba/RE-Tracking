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

// if (system.args.length < 3) {
// 	console.log('proper usage: getDataCasper.js username password');
// 	casper.exit();
// }

var fs = require('fs');
var extractedData = [];

casper.start('http://www.realtytrac.com/', function() {
    this.echo(this.getTitle());
});

if (system.args.length >= 4) {
	casper.thenEvaluate(function(username, password) {
	   $('#username').val(username);
		$('#password').val(password);
		$('#headerLoginForm').submit();
	}, system.args[2], system.args[3]);
}
else {
	casper.thenOpen('http://www.realtytrac.com/dashboard/', function(){
		console.log('No credentials passed so just proceeding without login');
	});
}

casper.then(function() {
    console.log('new location is ' + this.getCurrentUrl());
});

casper.thenEvaluate(function(searchString) {
    $('#txtSearch').val(searchString);
	 $('#header_searchspot').trigger('click');
}, system.args[1]);

casper.waitForSelector('dd.equity', function() {
	casper.capture('afterSearch.png');
	console.log('Found dd.equity');
});

// casper.then(function() {
// 	console.log('Added filter criteria and submitting');
//
// 	casper.evaluate(function() {
// 		$('.advancedSearchLink:first').click();
// 		$('#SH_ddlBeds').prop('disabled', false).val('3');
//   	   $('#SH_ddlBaths').prop('disabled', false).val('2');
// 		//$('.searchSubmitButton').click();
// 	});
//
// 	casper.capture('afterSearch2.png');
// 	console.log('riverside county search triggered, new location is ' + this.getCurrentUrl());
// });

// casper.waitForSelector('.filter-item', function() {
// 	casper.capture('afterSearch3.png');
// 	console.log('Found filter items');
// });

var preForclosureUrl;
casper.waitForSelector('#listTabs', function() {
   preForclosureUrl = casper.evaluate(function() {
      return $('a.tab-item:eq(1)').attr('href');
   });
   preForclosureUrl = 'http://www.realtytrac.com' + preForclosureUrl + '?sortbyfield=equity,desc&itemsper=50';

   console.log('going to "' + preForclosureUrl + '"');
   casper.thenOpen(preForclosureUrl, function() {
      console.log('at ' + preForclosureUrl);
   });
});

// casper.waitForSelector('#viewsPerPage', function() {
// 	console.log('at ' + this.getCurrentUrl());
// 	casper.capture('preViewsPerPage.png');
// 	console.log('#viewsPerPage found, choosing 50 per page');
// 	casper.evaluate(function() {
// 		$('#viewsPerPage')[0].selectedIndex = $('#viewsPerPage').children().length - 1;
// 		$('#viewsPerPage').trigger('change');
// 	});
// });
//
// casper.waitForSelector('#sortBy', function() {
// 	console.log('at ' + this.getCurrentUrl());
// 	casper.capture('preSortBy.png');
// 	console.log('#sortBy found, choosing equity high to low');
// 	casper.evaluate(function() {
// 		$('#sortBy')[0].selectedIndex = $('#sortBy').children().length - 3;
// 		$('#sortBy').trigger('change');
// 	});
// });

casper.waitForSelector('dd.equity', function() {
	console.log('at ' + this.getCurrentUrl());
	casper.capture('ddEquityFound.png');
	console.log('found div.pagination');

   var pageCount = casper.evaluate(function() {
		var lastPageNumber = $('.pagination').find('.page:last').text();
		if (lastPageNumber.length > 2) {
			if (lastPageNumber.substr(0, 2) == '..') {
				lastPageNumber = lastPageNumber.substr(2);
			}
		}

		return lastPageNumber;
   });

   var pages = [];
   for (i = 0; i < pageCount - 1; i++) {
      pages.push(i+1);
   }

   console.log('pages: ' + pageCount);

   casper.waitForSelector('dd.equity', function() {
      var currentPageNum = casper.evaluate(function() {
         return $('div.pagination > span.current').text();
      });

		var extractJson = function() {
			var houseArray = [];

			$('div.house > div.content').each(function(i, content) {
				var houseData = {};

				var addressData = $(content).find('div.basicdata > div.address-data a > strong');
				houseData.streetAddress = addressData.find('span[itemprop=streetAddress]').text();
				houseData.city = addressData.find('span[itemprop=addressLocality]').text();
				houseData.state = addressData.find('span[itemprop=addressRegion]').text();
				houseData.zip = addressData.find('span[itemprop=postalCode]').text();
				houseData.url = 'http://www.realtytrac.com' + addressData.parents('a:first').attr('href');

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

							if (equityLtv.length == 2) {
								houseData.equity = equityLtv[0];
								houseData.ltv = equityLtv[1];
							}
							else{
								houseData.equity = null;
								houseData.ltv = null;
							}
						}
					}
				});

				if ($(content).children('.hot-deal-property').length > 0) {
					houseData.isHotDeal = true;
				}
				else {
					houseData.isHotDeal = false;
				}

				houseArray.push(houseData);
			});

			return houseArray;
		}

      var houseArray = casper.evaluate(extractJson);

      for (i = 0; i < houseArray.length; i++) {
         extractedData.push(houseArray[i]);
      }

		casper.capture('captureData.png');
		//pages = []; //todo: remove this

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
   var specialChars = /[^\w]+/;
   var fileName = system.args[1].replace(specialChars, '-') + '.json';

   console.log('Finished capturing data, writing results to ' + fileName)
   fs.write(fileName, JSON.stringify(extractedData), 'wb');
});

casper.run();
