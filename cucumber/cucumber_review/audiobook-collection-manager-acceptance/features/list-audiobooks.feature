Feature: Display the list of audiobooks
  In order to know which audiobooks the collection contains
  As an audiobook enthusiast
  I want to see a list of all audiobooks

  Scenario: Display the list of all audiobooks in the collection
    Given some audiobooks in the collection
    When I visit the list of audiobooks
    Then I see all audiobooks

  Scenario: Filter the list
    Given some audiobooks in the collection
    When I visit the list of audiobooks
    And I search for "Cor"
    Then I only see the titles that match the term
    When I remove the filter
    Then I see all the books again
