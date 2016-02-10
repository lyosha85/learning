class User < ActiveRecord::Base
  has_many :posts
  scope :a, -> { where( active:true ) }
  scope :b, -> { where( active:false ) }
  POSSIBLE_SCOPES = [:a, :b]
end
