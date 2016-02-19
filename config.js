module.exports = {
	port: 8888,
	http_timeout: 5000,
	bid_timeout: 1000,
	adapters: {
		'aol': {},
		'sovrn': {
			bid_url: 'http://adintegration.lijit.com/rtb/bid'
		},
		'appnexus': {},
	},
}