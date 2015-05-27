
sum = 0
[1,1,1].each do |element|
  sum += element
end
puts sum

sum = [2,2,2].inject(0) {|sum, element| sum + element }
puts sum

sum = [3,3,3].inject(&:+)
puts sum

sum = [4,4,4].reduce(:+)
puts sum
