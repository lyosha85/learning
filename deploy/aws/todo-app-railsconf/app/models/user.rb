class User < ActiveRecord::Base
  has_many :subscriptions
  has_many :tasks, through: :subscriptions
  before_save :downcase_user_fields

  validates :username, presence: true,
    length: { minimum: 5, maximum: 32 },
    uniqueness: { case_sensitive: false }

  # Hat tip to Michael Hartl's Rails Tutorial
  VALID_EMAIL_REGEX = /\A[\w+\-.]+@[a-z\-.]+\.[a-z]+\z/i
  validates :email, presence: true, length: { maximum: 255 },
    format: { with: VALID_EMAIL_REGEX },
    uniqueness: { case_sensitive: false }

  has_secure_password

  def User.digest(string)
    cost = ActiveModel::SecurePassword.min_cost ? BCrypt::Engine::MIN_COST :
      BCrypt::Engine.cost
    BCrypt::Password.create(string, cost: cost)
  end

  def downcase_user_fields
    self.username = username.downcase
    self.email    = email.downcase
  end
end
