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

class Rental
	attr_reader :movie, :days_rented

	def initialize(movie, days_rented)
		@movie, @days_rented = movie, days_rented
	end
end