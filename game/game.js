var Words = new Mongo.Collection("words");

if (Meteor.isClient) {
    if(typeof Session.get('handle') === 'undefined') {
        Session.set('handle', 'User' + Math.random());
    }

    Template.greeting.helpers({
        user: function () {
            return Session.get('handle');
        }
    });
    Template.story.helpers({
        words: function () {
            return Words.find();
        }
    });
    Template.story.events({
        'keypress input': function (event) {
            var input = event.target;
            if (event.keyCode === 13) {
                Words.insert({
                    word: input.value
                });
                input.value = '';
            }
        }
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
    });
}
