const reverse = string => {
	return string
		.split('')
		.reverse()
		.join('')
}

const average = array => {
	if (!array || array.length === 0) return 0

	const reducer = (sum, item) => sum + item

	return array.length === 0
		? 0
		: array.reduce(reducer, 0) / array.length
}

module.exports = {
	reverse,
	average,
}