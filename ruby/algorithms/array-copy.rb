a = [1,2,3,4]

def copy_array(arr)
  new_arr = []
  arr.each_with_index do |v,i|
    new_arr[i] = v
  end
  return new_arr
end

b = copy_array a

puts a
puts b
