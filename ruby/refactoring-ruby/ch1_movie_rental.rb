class Movie
	REGULAR
	NEW_RELEASE
	CHILDRENS

	attr_reader :title
	attr_accessor :price_code

	def initialize(title, price_code)
		@title, @price_code = title, price_code
	end
end
