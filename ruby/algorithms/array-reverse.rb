array = [1,2,3,4,5]

def reverse_array(arr)
  i = 0
  j = arr.size

  while i < j do
    last = arr[j]
    first = arr[i]

    arr[i] = last
    arr[j] = first

    i += 1
    j -= 1
  end
  return arr
end

puts array
puts reverse_array array
