let deleteEvent = document.getElementsByClassName("deleteEvent");

Array.from(deleteEvent).forEach(function(element) {
    element.addEventListener('click', function(e){
        let _id = e.target.dataset.value
        console.log(_id)
      fetch('deleteOne', {
        method: 'delete',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          '_id': _id,
        })
      }).then(function (response) {
        window.location.reload()
        console.log("Event has been deleted")
      })
    });
});