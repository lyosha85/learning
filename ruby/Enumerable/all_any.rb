puts %w[ant bear cat].all? {|word| word.class == String}
puts (%w[ant bear cat] << 3).any? {|word| word.class == Fixnum}