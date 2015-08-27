Feature: List a Collection
  As a client of storra
  I want to list a collection
  So that I know, which documents it contains

  Scenario: List an empty collection
    Given an empty collection
    When I GET the collection
    Then the http status should be 200
    And I should see an empty list of documents

  Scenario: List a non-existing collection
    Given a non-existing collection
    When I GET the collection
    Then the http status should be 404
    And I should see "The requested resource was not found."

  Scenario: List a collection with documents
    Given a collection with documents
    When I GET the collection
    Then the http status should be 200
    And I should see a list of documents
