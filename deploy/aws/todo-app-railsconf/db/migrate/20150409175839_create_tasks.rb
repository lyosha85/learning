class CreateTasks < ActiveRecord::Migration
  def change
    create_table :tasks do |t|
      t.belongs_to :user, index: true

      t.string :name
      t.string :description
      t.string :state

      t.timestamps null: false
    end
  end
end
