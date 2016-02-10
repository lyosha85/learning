# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ name: 'Chicago' }, { name: 'Copenhagen' }])
#   Mayor.create(name: 'Emanuel', city: cities.first)
n = 0
10.times { User.create!(name: "User #{n}"); n+=1}

50.times { Post.create(user: User.all.sample, title: "Title", body:"Body")}
puts "#{User.count} users. #{Post.count} posts."
