class User < ActiveRecord::Base
  has_many :posts
  scope :active, -> { where( active:true ) }
end
