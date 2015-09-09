# this is an array of paths relative to the root of the repo dir where
# the cookbooks referenced in roles and/ or node definitions are
# located.
# Cookbooks contain recipies for software that needs to be installed
# on the remote 'nodes' (machines with )
cookbook_path ["cookbooks", "site-cookbooks"]

# path relative to the root of the repo where node definitions are
# stored. Nodes are the remote machines that are being provisioned
node_path     "nodes"

# relative path to the root of the dir where tole definitions are
# stored
role_path     "roles"

# path relative to the root directory where data_bags are stored
# what are data_bags? and why some of them are encrypted?
data_bag_path "data_bags"
#encrypted_data_bag_secret "data_bag_key"

knife[:berkshelf_path] = "cookbooks"
