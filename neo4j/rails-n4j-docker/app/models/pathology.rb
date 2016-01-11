class Pathology
	include Neo4j::ActiveNode

	property :name
	has_many :in, :drug_classes, type: :cures
end