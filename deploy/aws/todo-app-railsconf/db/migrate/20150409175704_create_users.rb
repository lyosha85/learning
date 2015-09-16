class CreateUsers < ActiveRecord::Migration
  def change
    create_table :users do |t|
      t.string :username
      t.string :email
      t.string :password_digest

      t.timestamps null: false

      t.index :email, unique: true
      t.index :username, unique: true
    end
  end
end
