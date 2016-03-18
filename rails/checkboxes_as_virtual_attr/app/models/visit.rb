class Visit < ActiveRecord::Base
  attr_accessor :choices, :freetext, :dur
  validates_presence_of :dur

  def possible_choices
    # %w(検診 初診 再診).map.with_index(1) {|k,v| [v,k]}
    # Hash[%w(検診 初診 再診).map.with_index.to_a]
    # %w(検診 初診 再診).map.with_index(1) {|v,k| {id: k,value:v}}
    %w(検診 初診 再診)
  end
end
