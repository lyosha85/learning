# Preresquisites for deploying to aws

group :production do 
  gem 'unicorn'
  gem 'mysql2'
end

deploy/before_symlink.rb # chef hook
run "cd #{release_path} && RAILS_ENV=production bundle exec rake assets:precompile"

