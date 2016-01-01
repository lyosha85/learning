namespace :db do
	task seed: :environment do
		seed_file = File.join('db/seeds.rb')
		load(seed_file) if File.exists?(seed_file)
	end
	task clear: :environment do
		Neoj4::Session.current.query('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r')
	end
end