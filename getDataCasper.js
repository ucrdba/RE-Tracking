phantom.casperPath = 'C:\\phantomjs\\n1k0-casperjs-1.0.4-0-ge3a77d0\\n1k0-casperjs-e3a77d0'; // phantom.casperPath = 'C:\\PhantomJS\\n1k0-casperjs-e3a77d0';
phantom.injectJs(phantom.casperPath + '\\bin\\bootstrap.js');

var system = require('system');
//console.log(system.args[1]);

var casper = require('casper').create({
   //verbose: true,
   //logLevel : 'debug',
  stepTimeout: 15000,
  viewportSize: {
    width: 1024,
    height: 768
  },
  pageSettings: {
    "userAgent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.10 (KHTML, like Gecko) Chrome/23.0.1262.0 Safari/537.10',
    "loadImages": false,
    "loadPlugins": false,
    "webSecurityEnabled": false,
    "ignoreSslErrors": true
  },
  onWaitTimeout: function() {
    casper.echo('Wait TimeOut Occured');
  },
  onStepTimeout: function() {
    casper.echo('Step TimeOut Occured');
  },
  exitOnError: false
});

casper.options.waitTimeout = 20000;

var fs = require('fs');
var extractedData = [];

casper.start('http://www.realtytrac.com/', function() {
    this.echo(this.getTitle());
});

if (system.args.length >= 6) {
	casper.thenEvaluate(function(username, password) {
	   $('#username').val(username);
		$('#password').val(password);
		$('#headerLoginForm').submit();
	}, system.args[4], system.args[5]);
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
	//casper.capture('afterSearch.png');
	console.log('Found dd.equity');
});

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

casper.waitForSelector('dd.equity', function() {
	console.log('at ' + this.getCurrentUrl());
	//casper.capture('ddEquityFound.png');
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

		//casper.capture('captureData.png');
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
   				this.wait(waitTime * 1000, function(){});
            });
         });
      });
   });
});

casper.then(function() {
   console.log('realtytrac processing complete');
})

casper.thenOpen('http://titleguy.net/', function(){});

casper.then(function() {
	console.log('Filling in login form with username/password');
	this.fill('#mainContent > div.content.home.clearfix > div.col-left > div.col-left-login > form', {
		 'username':    system.args[2],
		 'Password':       system.args[3]
	 }, true);
});

// casper.thenClick('#continue-cust', function() {
//    this.wait(5000, function(){});
// });
//
// casper.thenClick('#ctl00_MainContent_Menu1_21', function() {
//
// });

/*casper.thenEvaluate(function(username, password) {
    console.log(username + '|' + password);
    var f = document.querySelector('form');
    f.querySelector('input[name=username]').value = username;
    f.querySelector('input[name=Password]').value = password;

    //f.submit();
}, system.args[2], system.args[3]);

casper.thenClick('#mainContent > div.content.home.clearfix > div.col-left > div.col-left-login > form > table > tbody > tr:nth-child(3) > td:nth-child(2) > input[type="submit"]', function() {
   console.log('Clicked submit button');
});*/
//
// casper.then(function() {
//    this.capture('test1.png');
//    console.log('Submitted form');
// })

// casper.thenOpen('http://www.google.com', function() {
//    this.capture('google.png');
// });

// casper.wait(5000, function() {
//    console.log('waited for 5 seconds');
// });

casper.then(function() {
   this.wait(10000, function(){});
   console.log('capturing screenshot titleguy-property-reports.png');
   this.capture('titleguy-property-reports.png');
});

// casper.waitForText('Property Reports', function() {
//    console.log('Found Property Reports link, clicking it');
// });

// var classicSeriesAccess;
// casper.then(function() {
//    //this.capture('classicSeriesAccess.png');
//    console.log('At ' + this.getCurrentUrl());
//
//    classicSeriesAccess = casper.evaluate(function() {
//       return jQuery('#tblMenuMain').find('a:eq(3)').attr('href');
//    });
//
//    console.log('classicSeriesAccess is ' + classicSeriesAccess);
//
//    casper.thenOpen(classicSeriesAccess, function() {
//       console.log('At ' + this.getCurrentUrl());
//    });
// });

casper.then(function() {
   console.log('Starting address loop');
   var i = 0;
   casper.each(extractedData, function (self, houseData) {
      try {
         casper.thenOpen('https://www.titleprofile.com/AddressEntry.asp', function() {
            i++;
            console.log('At ' + this.getCurrentUrl());
            console.log('Current houseData: ' + JSON.stringify(houseData));
         });

         casper.then(function() {
            console.log('Filling address form out and submitting');

            this.fill('form', {
                 'address':    houseData.streetAddress,
                 'city':       houseData.city,
                 'state':      houseData.state,
                 'zip':        houseData.zip
             }, true);
         });

         casper.then(function() {
            //this.capture('afterAddressSubmit.png');
            var owner = '';
            try {
               owner = this.fetchText('body > p > table:nth-child(1) > tbody > tr > td:nth-child(2) > p:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(2) > div > b > i');
            } catch(e) {
               owner = '';
            }

            houseData.owner = owner;
         });

         // casper.thenClick('#CyberProfileTB > tbody > tr > td > nobr > a', function() {
         //    console.log('opening property reports');
         // });

         // var recentForclosureActivity = false;
         // casper.waitForText('Recent Foreclosure Activity', function() {
         //    console.log('recentForclosureActivity = true');
         //    recentForclosureActivity = true;
         // }, function() {
         //    console.log('recentForclosureActivity = false');
         //    recentForclosureActivity = false;
         // }, 500);
         //
         // casper.then(function() {
         //    houseData.recentForclosureActivity = recentForclosureActivity;
         // });
         //
         // casper.thenClick('#N5TB > tbody > tr > td > nobr > a', function() {
         //    console.log('opening comparable properties');
         // });
         //
         // casper.then(function() {
         //    console.log('extracting comparable property data');
         //
         //    var comparableData = casper.evaluate(function() {
         //       var comparableData = {
         //          properties: []
         //       };
         //
         //       var rows = document.querySelectorAll('body > form > table > tbody > tr');
         //       for (var i = 3; i < rows.length; i++) {
         //          var property = {};
         //          property.address = rows[i].children[1].innerText;
         //          property.date = rows[i].children[2].innerText;
         //          property.price = rows[i].children[3].innerText;
         //          property.pricePerSquareFoot = rows[i].children[4].innerText;
         //          property.bldArea = rows[i].children[5].innerText;
         //          property.rmBrBath = rows[i].children[6].innerText;
         //          property.yearBuilt = rows[i].children[7].innerText;
         //          property.lotArea = rows[i].children[8].innerText;
         //          property.pool = rows[i].children[9].innerText;
         //          property.proximity = rows[i].children[10].innerText;
         //          comparableData.properties.push(property);
         //       }
         //
         //       return comparableData;
         //    });
         //
         //    houseData.comparableData = comparableData;
         // });

         casper.then(function() {
            console.log('Finished processing ' + i + ' of ' + extractedData.length);
            console.log('--------------------------------------------------------');
            console.log('Starting processing ' + (i+1) + ' of ' + extractedData.length);
         });
      } catch(e) {
         console.log('Error while processing ' + JSON.stringify(houseData));
      }
   });
});

casper.then(function() {
   //this.capture('titleguy.png');
})

//Write JSON out to disk
casper.then(function() {
   var specialChars = /[^\w]+/;
   var fileName = system.args[1].replace(specialChars, '-') + '.json';

   console.log('Finished capturing data, writing results to ' + fileName)
   fs.write(fileName, JSON.stringify(extractedData), 'wb');
});

casper.run();
