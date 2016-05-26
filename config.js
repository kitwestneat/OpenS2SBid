module.exports = {
	port: 8888,
	http_timeout: 5000,
	bid_timeout: 1000,
	adapters: {
		'aol': {},
		'appnexus': {},
		'pulsepoint': {
			bid_url: 'http://rts.lga.contextweb.com/rt-seller/bid/test/openrtb/pbhnetwork',
			qps_limit: 500
		},
		'sovrn': {
			bid_url: 'http://adintegration.lijit.com/rtb/bid'
		},
	},
}
