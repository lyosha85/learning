class Movie
	REGULAR = 0
	NEW_RELEASE = 1
	CHILDRENS = 2

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

class Customer
	attr_reader :name

	def initialize(name)
		@name = name
		@rentals = []
	end

	def add_rental(arg)
		@rentals << arg
	end
end
