# use redis from ppa rather than the one
# available in the package manager. rwky
# builds the stable version and is kept
# consistently up to date. We need python-software-properties
# for add-apt-repository to work

package 'python-software-properties'

# the first line is what will be displayed in the console while
# running this command.
# "bash" means that whats inside the block will be ran in bash
bash 'adding stable redis ppa' do
  # althrough it says root, its not the same as logging as root
  # the difference is that env variables are not available
  # such as HOME and PATH. if you plan to use those, make sure
  # to state them explicitly
  user 'root'  # run as user root,
               # and run this code..
  code <<-EOC
    add-apt-repository ppa:chris-lea/redis-server
    apt-get update
  EOC
end

# this tells chef to check if redis is installed and install if not
package 'redis-server'

# use custom redis configuration file by copying from our template
# this will look for the redis.conf in redis-tlq/templates/default
# --> redis-tql is the name of the cookbook
# parse any erb, and copy it into /etc/redis_redis.conf
# and finally make it owned by root with group root, 0644 premission
template "/etc/redis/redis.conf" do
  owner "root"
  group "root"
  mode "0644"
  source "redis.conf.erb"
  notifies :run, "execute[restart-redis]", :immediately
end

# add an init script to control redis
template "/etc/init.d/redis-server" do
  owner "root"
  group "root"
  mode "0755"
  source "redis-server.erb"
  notifies :run, "execute[restart-redis]", :immediately
end

execute "chown redis:redis /etc/redis"

execute "restart-redis" do
  # restart redis since we might have changed
  # config.
  command "/etc/init.d/redis-server restart"
  action :nothing
end
