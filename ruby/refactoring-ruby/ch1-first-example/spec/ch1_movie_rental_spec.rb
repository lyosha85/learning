require 'ch1_movie_rental'

# RSpec.describe Customer do
# 	describe '#add_rental' do
# 		let(:movie) { Movie.new("Fight Club", 100 ) }
# 		let(:rental)
# 		it 'should add a movie' do
# 			before 
# 		end
# 	end
# end

RSpec.describe Movie do
	describe "#new" do
		let(:movie) { Movie.new("Fight Club", 100) }
		it { movie.title == "Fight Club"}
		it { movie.price_code == 100 }
	end
end	

RSpec.describe Rental do
	describe "#new" do
		let(:rental) { Rental.new( Movie.new("Starwars", 102), 6 ) }
		it {rental.movie.should be_a Movie}
		it {rental.days_rented == 6}
	end
end

RSpec.describe Customer do

end