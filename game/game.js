Stories = new Mongo.Collection("stories");
Handlebars.registerHelper("log", function(optionalValue) {
    console.log("logging: ", optionalValue, "this", this);
});

if (Meteor.isClient) {
    if(typeof Session.get('handle') === 'undefined') {
        Session.set('handle', 'User' + Math.random());
    }
    if(typeof Session.get('story') === 'undefined') {
        Session.set('story', Stories.findOne()._id);
    }

    Template.greeting.helpers({
        user: function () {
            return Session.get('handle');
        }
    });
    Template.story.helpers({
        addingDisabled: function () {
            var locking = Stories.findOne(Session.get('story')).locking;
            return (locking.enabled && locking.author !== Session.get('handle')) ? 'disabled' : '';
        },
        story: function () {
            return Stories.findOne(Session.get('story'));
        }
    });
    Template.story.events({
        'keypress input': function (event) {
            var input = event.target;
            if (event.keyCode === 13) {
                Stories.update(Session.get('story'), {
                    $set: {
                        locking: {
                            enabled: false,
                            author: null
                        }
                    },
                    $push: {
                        words: {
                            handle: Session.get('handle'),
                            word: input.value
                        }
                    }
                });
                input.value = '';
            } else {
                Stories.update(Session.get('story'), {
                    $set: {
                        locking: {
                            enabled: true,
                            author: Session.get('handle')
                        }
                    }
                });
            }
        }
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        if(Stories.find().count() === 0) {
            Stories.insert({
                locking: {
                    enabled: false,
                    author: null
                },
                words: []
            })
        }
    });
}
